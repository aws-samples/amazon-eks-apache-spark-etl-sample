package test.scala

import org.apache.spark.sql.{SQLContext, SparkSession}
import org.apache.spark.{SparkConf, SparkContext}
import org.scalatest.{BeforeAndAfterAll, FunSuite, Matchers}

import scala.reflect.io.Path
import scala.util.Try

trait SparkTestSession extends FunSuite with BeforeAndAfterAll with Matchers {
  var spark: SparkSession = _

  override def beforeAll(): Unit = {
    val master = "local[*]"
    val appName = "MyApp"
    val conf: SparkConf = new SparkConf()
      .setMaster(master)
      .setAppName(appName)
      .set("spark.driver.allowMultipleContexts", "false")
      .set("spark.ui.enabled", "false")

    spark = SparkSession.builder().config(conf).getOrCreate()
    Try(Path("src/test/resources/results/").deleteRecursively)
    super.beforeAll()
  }

  override def afterAll(): Unit = {
    spark.close()
    Try(Path("src/test/resources/results/").deleteRecursively)
    super.afterAll()
  }
}