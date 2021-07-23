import org.apache.spark.sql.{SQLContext, SparkSession}
import org.apache.spark.{SparkConf, SparkContext}
import org.scalatest.{BeforeAndAfterAll, FunSuite, Matchers}
import java.nio.file.Paths
import scala.util.Try
import scala.reflect.io.Path


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
      .set("spark.sql.warehouse.dir", System.getProperty("user.dir")+"/src/test/resources/results")

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