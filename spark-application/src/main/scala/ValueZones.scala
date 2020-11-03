import org.apache.log4j.Logger
import org.apache.log4j.Level
import org.apache.spark.sql.{Dataset, Row, SparkSession}
import org.apache.spark.sql.functions._

object ValueZones {

    val rideColumns = List(
      "VendorID",
      "pickup_datetime",
      "dropoff_datetime",
      "store_and_fwd_flag",
      "RatecodeID",
      "PULocationID",
      "DOLocationID",
      "passenger_count",
      "trip_distance",
      "fare_amount",
      "extra",
      "mta_tax",
      "tip_amount",
      "tolls_amount",
      "improvement_surcharge",
      "total_amount",
      "payment_type"
    )

  private val logger = Logger.getLogger(this.getClass)

  lazy val session =
    SparkSession.builder
      .appName("nyctaxi-value-zones")
      .getOrCreate()

  def main(args: Array[String]) {

    // check arguments
    if (args.length != 4)
      throw new IllegalArgumentException(
        "Parameters : "+
          "<targetBucket> "
      )
    logger.setLevel(Level.INFO)
    try {
      runJob(yellow = args(0).split(",").toList,
        green = args(1).split(",").toList,
        zones = args(2),
        target = args(3)
      )
      session.stop()
    } catch {
      case ex: Exception =>
        logger.error(ex.getMessage)
        logger.error(ex.getStackTrace.toString)
    }
  }

  def readGreen( green: String): Dataset[Row] = {
    import session.implicits._

    session.read
      .option("header","true")
      .option("inferSchema", "true")
      .option("enforceSchema", "false")
      .option("timeStampFormat", "yyyy-MM-dd HH:mm:ss")
      .option("columnNameOfCorruptRecord", "error")
      .csv(green)
      .filter(col("lpep_pickup_datetime").gt("2016"))
      .filter(col("lpep_pickup_datetime").lt("2021"))
      .withColumnRenamed("lpep_pickup_datetime","pickup_datetime")
      .withColumnRenamed("lpep_dropoff_datetime","dropoff_datetime")
      .select("VendorID", rideColumns.filter(_!="VendorID"): _*)
  }

  def readYellow( yellow: String): Dataset[Row] = {
    import session.implicits._

    session.read
      .option("header","true")
      .option("inferSchema", "true")
      .option("enforceSchema", "false")
      .option("timeStampFormat", "yyyy-MM-dd HH:mm:ss")
      .option("columnNameOfCorruptRecord", "error")
      .csv(yellow)
      .filter(col("tpep_pickup_datetime").gt("2016"))
      .filter(col("tpep_pickup_datetime").lt("2021"))
      .withColumnRenamed("tpep_pickup_datetime","pickup_datetime")
      .withColumnRenamed("tpep_dropoff_datetime","dropoff_datetime")
      .select("VendorID", rideColumns.filter(_!="VendorID"): _*)
  }

  def runJob( yellow :List[String], green :List[String], zones :String, target :String) = {

    logger.info("Execution started")
    import session.implicits._
    session.conf.set("spark.sql.session.timeZone", "America/New_York")

    val yellowRides = yellow.map(readYellow(_)).reduceLeft( (a,b) => a.union(b))

    val greenRides = green.map(readGreen(_)).reduceLeft( (a,b) => a.union(b))

    val zonesInfo = session.read
      .option("header","true")
      .option("inferSchema", "true")
      .option("enforceSchema", "false")
      .option("columnNameOfCorruptRecord", "error")
      .csv(zones)

    val allEventsWithZone = yellowRides
      .union(greenRides)
      .withColumn("taxiColor",lit("green"))
      .withColumn("duration", unix_timestamp($"dropoff_datetime").minus(unix_timestamp($"pickup_datetime")))
      .withColumn("minute_rate",$"total_amount".divide($"duration") * 60)
      .join(zonesInfo,$"PULocationID" === $"LocationID")

    allEventsWithZone.cache

    val zoneAttractiveness = allEventsWithZone
      .select("pickup_datetime","minute_rate","taxiColor","LocationID","Borough", "Zone")
      .groupBy($"LocationID", date_trunc("hour",$"pickup_datetime") as "pickup_hour")
      .pivot("taxiColor",Seq("yellow", "green"))
      .agg("minute_rate" -> "avg", "minute_rate" -> "count")
      .withColumnRenamed("yellow_avg(minute_rate)","yellow_avg_minute_rate")
      .withColumnRenamed("yellow_count(minute_rate)","yellow_count")
      .withColumnRenamed("green_avg(minute_rate)","green_avg_minute_rate")
      .withColumnRenamed("green_count(minute_rate)","green_count")

    val rawQuery = allEventsWithZone
      .withColumn("year", year($"pickup_datetime"))
      .withColumn("month", month($"pickup_datetime"))
      .withColumn("day", dayofmonth($"pickup_datetime"))
      .repartition($"year",$"month")
      .sortWithinPartitions("day")
      .write
      .mode("OVERWRITE")
      .partitionBy("year","month")
      .parquet(target+"/raw-rides")

    val aggregateQuery = zoneAttractiveness
      .repartition(1)
      .sortWithinPartitions($"pickup_hour")
      .write
      .mode("OVERWRITE")
      .parquet(target+"/value-rides")
  }
}