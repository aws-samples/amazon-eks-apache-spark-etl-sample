import scala.reflect.io.Path
import scala.util.Try

import com.holdenkarau.spark.testing.{DataFrameSuiteBase, SharedSparkContext, SparkSessionProvider}
import org.apache.spark.sql.SparkSession
import org.scalatest.FunSuite

class ValueZonesSpec extends FunSuite with DataFrameSuiteBase with SharedSparkContext {

  override def beforeAll(): Unit = {
    super[SharedSparkContext].beforeAll()
    SparkSessionProvider._sparkSession = SparkSession.builder()
      .appName("test")
      .config("spark.sql.shuffle.partitions", "1")
      .master("local[1]")
      .getOrCreate()
  }

  test("raw rides results test") {

    ValueZones.runJob(spark,
      List("src/test/resources/yellow_tripdata_sample.csv"),
      List("src/test/resources/green_tripdata_sample.csv"),
      List("src/test/resources/taxi_zone_lookup.csv"),
      "src/test/resources/results/"
    )

    val results = spark.read.parquet("src/test/resources/results/raw-rides")

    val referenceResults = spark.read.parquet("src/test/resources/raw-rides/")

    assertDataFrameEquals(results, referenceResults)
  }

  test("value rides results test") {

    val results = spark.read.parquet("src/test/resources/results/value-rides")

    val referenceResults = spark.read.parquet("src/test/resources/value-rides/")

    assertDataFrameEquals(results, referenceResults)
  }

  override def afterAll(): Unit = {
    Try(Path("src/test/resources/results/").deleteRecursively)
  }

}
